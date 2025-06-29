import React, { useEffect, useState } from 'react';
import { Users, Shield, Key, Lock, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { securityService, Role, AccessRule, Resource } from '../../services/security';
import { useToast } from '../../hooks/use-toast';

const AccessControl: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null);
  const { toast } = useToast();

  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    inherits: [] as string[]
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    effect: 'allow' as 'allow' | 'deny',
    roles: [] as string[],
    resources: [] as string[],
    actions: [] as string[]
  });

  useEffect(() => {
    loadAccessControlData();
  }, []);

  const loadAccessControlData = async () => {
    try {
      setLoading(true);
      const [rolesData, rulesData, resourcesData] = await Promise.all([
        securityService.getRoles(),
        securityService.getAccessRules(),
        securityService.getResources()
      ]);
      setRoles(rolesData.roles);
      setRules(rulesData.rules);
      setResources(resourcesData.resources);
    } catch (error) {
      console.error('Failed to load access control data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load access control data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await securityService.updateRole(editingRole.id, roleForm);
        toast({
          title: 'Success',
          description: 'Role updated successfully'
        });
      } else {
        await securityService.createRole({
          id: roleForm.name.toLowerCase().replace(/\s+/g, '_'),
          ...roleForm
        });
        toast({
          title: 'Success',
          description: 'Role created successfully'
        });
      }
      setShowRoleDialog(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: [], inherits: [] });
      loadAccessControlData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save role',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await securityService.deleteRole(roleId);
      toast({
        title: 'Success',
        description: 'Role deleted successfully'
      });
      loadAccessControlData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete role',
        variant: 'destructive'
      });
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await securityService.updateAccessRule(editingRule.id, ruleForm);
        toast({
          title: 'Success',
          description: 'Access rule updated successfully'
        });
      } else {
        await securityService.createAccessRule({
          id: ruleForm.name.toLowerCase().replace(/\s+/g, '_'),
          ...ruleForm,
          conditions: []
        });
        toast({
          title: 'Success',
          description: 'Access rule created successfully'
        });
      }
      setShowRuleDialog(false);
      setEditingRule(null);
      setRuleForm({ name: '', effect: 'allow', roles: [], resources: [], actions: [] });
      loadAccessControlData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save access rule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await securityService.deleteAccessRule(ruleId);
      toast({
        title: 'Success',
        description: 'Access rule deleted successfully'
      });
      loadAccessControlData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete access rule',
        variant: 'destructive'
      });
    }
  };

  const isSystemRole = (roleId: string) => {
    return ['admin', 'operator', 'user', 'guest'].includes(roleId);
  };

  const allPermissions = [
    'system.view', 'system.configure', 'system.monitor',
    'agents.create', 'agents.view', 'agents.update', 'agents.delete', 'agents.execute',
    'models.view', 'models.pull', 'models.delete',
    'tasks.create', 'tasks.view', 'tasks.execute', 'tasks.cancel',
    'security.view', 'security.configure', 'security.audit',
    'profile.view', 'profile.update'
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">
            <Users className="w-4 h-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Shield className="w-4 h-4 mr-2" />
            Access Rules
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Key className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Roles</CardTitle>
                  <CardDescription>Manage roles and their permissions</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', permissions: [], inherits: [] });
                    setShowRoleDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Inherits</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Badge variant={role.id === 'admin' ? 'destructive' : 'secondary'}>
                            {role.name}
                          </Badge>
                          {isSystemRole(role.id) && (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.inherits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {role.inherits.map((inherit) => (
                              <Badge key={inherit} variant="outline" className="text-xs">
                                {inherit}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {!isSystemRole(role.id) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRole(role);
                                  setRoleForm({
                                    name: role.name,
                                    description: role.description,
                                    permissions: [...role.permissions],
                                    inherits: [...role.inherits]
                                  });
                                  setShowRoleDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Access Rules</CardTitle>
                  <CardDescription>Define access control rules for resources</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null);
                    setRuleForm({ name: '', effect: 'allow', roles: [], resources: [], actions: [] });
                    setShowRuleDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Effect</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant={rule.effect === 'allow' ? 'default' : 'destructive'}>
                          {rule.effect.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.resources.map((resource) => (
                            <Badge key={resource} variant="outline" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.actions.map((action) => (
                            <Badge key={action} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              setRuleForm({
                                name: rule.name,
                                effect: rule.effect,
                                roles: [...rule.roles],
                                resources: [...rule.resources],
                                actions: [...rule.actions]
                              });
                              setShowRuleDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Protected Resources</CardTitle>
              <CardDescription>System resources and their available actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map((resource) => (
                  <Card key={resource.id} className="border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">{resource.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {resource.actions.map((action) => (
                          <Badge key={action} variant="secondary">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              Define role properties and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="Enter role name"
                disabled={!!editingRole && isSystemRole(editingRole.id)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Enter role description"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-2">
                  {allPermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={roleForm.permissions.includes(permission)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRoleForm({
                              ...roleForm,
                              permissions: [...roleForm.permissions, permission]
                            });
                          } else {
                            setRoleForm({
                              ...roleForm,
                              permissions: roleForm.permissions.filter(p => p !== permission)
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={permission}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label>Inherits From</Label>
              <div className="flex flex-wrap gap-2">
                {roles
                  .filter(r => r.id !== editingRole?.id)
                  .map((role) => (
                    <div key={role.id}>
                      <Checkbox
                        id={`inherit-${role.id}`}
                        checked={roleForm.inherits.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRoleForm({
                              ...roleForm,
                              inherits: [...roleForm.inherits, role.id]
                            });
                          } else {
                            setRoleForm({
                              ...roleForm,
                              inherits: roleForm.inherits.filter(r => r !== role.id)
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`inherit-${role.id}`}
                        className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {role.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {editingRole ? 'Update' : 'Create'} Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Access Rule' : 'Create New Access Rule'}</DialogTitle>
            <DialogDescription>
              Define access control rules for resources
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-effect">Effect</Label>
              <Select
                value={ruleForm.effect}
                onValueChange={(value: 'allow' | 'deny') => setRuleForm({ ...ruleForm, effect: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-role-${role.id}`}
                      checked={ruleForm.roles.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRuleForm({
                            ...ruleForm,
                            roles: [...ruleForm.roles, role.id]
                          });
                        } else {
                          setRuleForm({
                            ...ruleForm,
                            roles: ruleForm.roles.filter(r => r !== role.id)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`rule-role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resources</Label>
              <div className="flex flex-wrap gap-2">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-resource-${resource.id}`}
                      checked={ruleForm.resources.includes(resource.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRuleForm({
                            ...ruleForm,
                            resources: [...ruleForm.resources, resource.id]
                          });
                        } else {
                          setRuleForm({
                            ...ruleForm,
                            resources: ruleForm.resources.filter(r => r !== resource.id)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`rule-resource-${resource.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {resource.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex flex-wrap gap-2">
                {['create', 'view', 'update', 'delete', 'execute', 'configure', '*'].map((action) => (
                  <div key={action} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-action-${action}`}
                      checked={ruleForm.actions.includes(action)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRuleForm({
                            ...ruleForm,
                            actions: [...ruleForm.actions, action]
                          });
                        } else {
                          setRuleForm({
                            ...ruleForm,
                            actions: ruleForm.actions.filter(a => a !== action)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`rule-action-${action}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {action === '*' ? 'All Actions' : action}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControl;